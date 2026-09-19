class CfgPatches
{
	class CompareSample
	{
		units[] = {};
		weapons[] = {};
		requiredVersion = 0.1;
		requiredAddons[] = {"DZ_Data", "DZ_Scripts"};
	};
};

class CfgMods
{
	class CompareSample
	{
		dir = "CompareSample";
		name = "Compare Sample 1.30";
		author = "DIFF";
		type = "mod";
		dependencies[] = {"Game", "World", "Mission"};
		class defs
		{
			class gameScriptModule
			{
				value = "";
				files[] = {"CompareSample/scripts/3_Game"};
			};
			class worldScriptModule
			{
				value = "";
				files[] = {"CompareSample/scripts/4_World"};
			};
			class missionScriptModule
			{
				value = "";
				files[] = {"CompareSample/scripts/5_Mission"};
			};
		};
	};
};
