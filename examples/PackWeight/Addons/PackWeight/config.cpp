class CfgPatches
{
	class PackWeight
	{
		units[] = {};
		weapons[] = {};
		requiredVersion = 0.1;
		requiredAddons[] = {"DZ_Data", "DZ_Scripts"};
	};
};

class CfgMods
{
	class PackWeight
	{
		dir = "PackWeight";
		picture = "";
		action = "";
		hideName = 0;
		hidePicture = 1;
		name = "Pack Weight";
		credits = "Lark";
		author = "Lark";
		authorID = "76561198044112044";
		version = "0.8.1";
		extra = 0;
		type = "mod";
		dependencies[] = {"World"};
		class defs
		{
			class worldScriptModule
			{
				value = "";
				files[] = {"PackWeight/scripts/4_World"};
			};
		};
	};
};
