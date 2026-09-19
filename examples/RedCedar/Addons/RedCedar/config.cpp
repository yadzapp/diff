class CfgPatches
{
	class RedCedar
	{
		units[] = {};
		weapons[] = {};
		requiredVersion = 0.1;
		requiredAddons[] = {"DZ_Data", "DZ_Scripts"};
	};
};

class CfgMods
{
	class RedCedar
	{
		dir = "RedCedar";
		name = "Red Cedar";
		author = "Cedar Works";
		type = "mod";
		dependencies[] = {"Core", "Game", "World", "Mission"};
		class defs
		{
			class engineScriptModule
			{
				value = "";
				files[] = {"RedCedar/scripts/1_Core"};
			};
			class gameLibScriptModule
			{
				value = "";
				files[] = {"RedCedar/scripts/2_GameLib"};
			};
			class gameScriptModule
			{
				value = "";
				files[] = {"RedCedar/scripts/3_Game"};
			};
			class worldScriptModule
			{
				value = "";
				files[] = {"RedCedar/scripts/4_World"};
			};
			class missionScriptModule
			{
				value = "";
				files[] = {"RedCedar/scripts/5_Mission"};
			};
		};
	};
};
